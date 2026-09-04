import ttkbootstrap as tb
from ttkbootstrap.constants import *
import mysql.connector
from tkinter import messagebox, END
from tkinter import ttk

class Application(tb.Window):
    def __init__(self):
        super().__init__(themename="cosmo")
        self.title("Gestion Achats et Ventes")
        self.geometry("1200x700")
        
        # Barre de navigation
        nav = tb.Frame(self, bootstyle="dark")
        nav.pack(side="top", fill="x")
        
        tb.Button(nav, text="Menu Principal", bootstyle="primary", command=self.show_menu).pack(side="left", padx=10, pady=5)
        tb.Button(nav, text="Achats", bootstyle="success", command=self.show_achats).pack(side="left", padx=10, pady=5)
        tb.Button(nav, text="Ventes", bootstyle="info", command=self.show_ventes).pack(side="left", padx=10, pady=5)
        
        # Conteneur principal
        self.container = tb.Frame(self)
        self.container.pack(fill="both", expand=True)
        
        self.show_menu()
    
    def clear_container(self):
        for widget in self.container.winfo_children():
            widget.destroy()
    
    def show_menu(self):
        self.clear_container()
        tb.Label(self.container, text="Bienvenue dans la Gestion des Achats et Ventes", font=("Arial", 24), bootstyle="primary").pack(pady=50)
    
    # ------------------- PAGE ACHATS -------------------
    def show_achats(self):
        self.clear_container()
        tb.Label(self.container, text="Gestion des Achats", font=("Arial", 20), bootstyle="success").pack(pady=10)
        
        form = tb.Frame(self.container)
        form.pack(pady=20)
        
        labels = ["Matricule", "Fournisseur", "Téléphone", "Produit", "Prix", "Quantité"]
        entries = {}
        for i, label in enumerate(labels):
            tb.Label(form, text=label).grid(row=i, column=0, padx=5, pady=5)
            if label == "Produit":
                entries[label] = ttk.Combobox(form, values=["iPhone 11", "Galaxy S22", "Xiaomi", "S10", "S12"])
                entries[label].grid(row=i, column=1, padx=5, pady=5)
            else:
                entries[label] = tb.Entry(form)
                entries[label].grid(row=i, column=1, padx=5, pady=5)
        
        def ajouter_achat():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "INSERT INTO tb_achat (code, fournisseur, telephone, produit, prix, quantite) VALUES (%s,%s,%s,%s,%s,%s)"
                val = (entries["Matricule"].get(), entries["Fournisseur"].get(), entries["Téléphone"].get(),
                       entries["Produit"].get(), entries["Prix"].get(), entries["Quantité"].get())
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Achat ajouté avec succès")
                conn.close()
                self.show_achats()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))
        
        def modifier_achat():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "UPDATE tb_achat SET fournisseur=%s, telephone=%s, produit=%s, prix=%s, quantite=%s WHERE code=%s"
                val = (entries["Fournisseur"].get(), entries["Téléphone"].get(), entries["Produit"].get(),
                       entries["Prix"].get(), entries["Quantité"].get(), entries["Matricule"].get())
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Achat modifié avec succès")
                conn.close()
                self.show_achats()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))
        
        def supprimer_achat():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "DELETE FROM tb_achat WHERE code=%s"
                val = (entries["Matricule"].get(),)
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Achat supprimé avec succès")
                conn.close()
                self.show_achats()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))
        
        tb.Button(form, text="Enregistrer", bootstyle="success", command=ajouter_achat).grid(row=len(labels), column=0, pady=10)
        tb.Button(form, text="Modifier", bootstyle="info", command=modifier_achat).grid(row=len(labels), column=1, pady=10)
        tb.Button(form, text="Supprimer", bootstyle="danger", command=supprimer_achat).grid(row=len(labels), column=2, pady=10)
        
        # Tableau dynamique
        table = ttk.Treeview(self.container, columns=(1,2,3,4,5,6), show="headings", height=10)
        table.pack(fill="both", expand=True, pady=20)
        headers = ["CODE", "FOURNISSEUR", "TELEPHONE", "PRODUIT", "PRIX", "QUANTITE"]
        for i, h in enumerate(headers, start=1):
            table.heading(i, text=h)
            table.column(i, width=150)
        
        try:
            conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
            cur = conn.cursor()
            cur.execute("SELECT * FROM tb_achat")
            for row in cur.fetchall():
                table.insert('', END, values=row)
            conn.close()
        except Exception as e:
            messagebox.showerror("Erreur", str(e))
    
    # ------------------- PAGE VENTES -------------------
    def show_ventes(self):
        self.clear_container()
        tb.Label(self.container, text="Gestion des Ventes", font=("Arial", 20), bootstyle="info").pack(pady=10)
        
        form = tb.Frame(self.container)
        form.pack(pady=20)
        
        labels = ["Matricule", "Client", "Téléphone", "Produit", "Prix", "Quantité"]
        entries = {}
        for i, label in enumerate(labels):
            tb.Label(form, text=label).grid(row=i, column=0, padx=5, pady=5)
            if label == "Produit":
                entries[label] = ttk.Combobox(form, values=["iPhone 11", "Galaxy S22", "Xiaomi", "S10", "S12"])
                entries[label].grid(row=i, column=1, padx=5, pady=5)
            else:
                entries[label] = tb.Entry(form)
                entries[label].grid(row=i, column=1, padx=5, pady=5)
        
        def ajouter_vente():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "INSERT INTO tb_vente (code, client, telephone, produit, prix, quantite) VALUES (%s,%s,%s,%s,%s,%s)"
                val = (entries["Matricule"].get(), entries["Client"].get(), entries["Téléphone"].get(),
                       entries["Produit"].get(), entries["Prix"].get(), entries["Quantité"].get())
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Vente ajoutée avec succès")
                conn.close()
                self.show_ventes()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))
        
        def modifier_vente():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "UPDATE tb_vente SET client=%s, telephone=%s, produit=%s, prix=%s, quantite=%s WHERE code=%s"
                val = (entries["Client"].get(), entries["Téléphone"].get(), entries["Produit"].get(),
                       entries["Prix"].get(), entries["Quantité"].get(), entries["Matricule"].get())
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Vente modifiée avec succès")
                conn.close()
                self.show_ventes()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))
        
        def supprimer_vente():
            try:
                conn = mysql.connector.connect(host="localhost", user="root", password="", database="gestion")
                cur = conn.cursor()
                sql = "DELETE FROM tb_vente WHERE code=%s"
                val = (entries["Matricule"].get(),)
                cur.execute(sql, val)
                conn.commit()
                messagebox.showinfo("Succès", "Vente supprimée avec succès")
                conn.close()
                self.show_ventes()
            except Exception as e:
                messagebox.showerror("Erreur", str(e))